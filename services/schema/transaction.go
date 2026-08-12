package schemaservice

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/fastschema/fastschema/db"
	"github.com/fastschema/fastschema/fs"
	"github.com/otiai10/copy"
)

const schemaTransactionPrefix = ".fastschema-schema-"

type schemaDirTransaction struct {
	root       string
	currentDir string
	stagedDir  string
	backupDir  string
	active     bool
}

func newSchemaDirTransaction(currentDir string) (*schemaDirTransaction, error) {
	currentDir = filepath.Clean(currentDir)
	root, err := os.MkdirTemp(filepath.Dir(currentDir), schemaTransactionPrefix)
	if err != nil {
		return nil, err
	}

	tx := &schemaDirTransaction{
		root:       root,
		currentDir: currentDir,
		stagedDir:  filepath.Join(root, "staged"),
		backupDir:  filepath.Join(root, "backup"),
	}

	if err := copy.Copy(currentDir, tx.stagedDir); err != nil {
		_ = os.RemoveAll(root)
		return nil, err
	}

	return tx, nil
}

func (tx *schemaDirTransaction) Activate() error {
	if tx.active {
		return errors.New("schema transaction is already active")
	}

	if err := os.Rename(tx.currentDir, tx.backupDir); err != nil {
		return fmt.Errorf("back up current schemas: %w", err)
	}

	if err := os.Rename(tx.stagedDir, tx.currentDir); err != nil {
		restoreErr := os.Rename(tx.backupDir, tx.currentDir)
		return errors.Join(
			fmt.Errorf("activate staged schemas: %w", err),
			wrapSchemaTransactionError("restore current schemas", restoreErr),
		)
	}

	tx.active = true
	return nil
}

func (tx *schemaDirTransaction) Rollback() error {
	if !tx.active {
		return nil
	}

	failedDir := filepath.Join(tx.root, "failed")
	if err := os.Rename(tx.currentDir, failedDir); err != nil {
		return fmt.Errorf("preserve failed schemas: %w", err)
	}

	if err := os.Rename(tx.backupDir, tx.currentDir); err != nil {
		restoreErr := os.Rename(failedDir, tx.currentDir)
		return errors.Join(
			fmt.Errorf("restore schema backup: %w", err),
			wrapSchemaTransactionError("restore failed schemas", restoreErr),
		)
	}

	tx.active = false
	return nil
}

func (tx *schemaDirTransaction) Commit() error {
	if !tx.active {
		return errors.New("schema transaction is not active")
	}

	tx.active = false
	return tx.discard()
}

func (tx *schemaDirTransaction) discard() error {
	if tx == nil || tx.active {
		return nil
	}

	return os.RemoveAll(tx.root)
}

func wrapSchemaTransactionError(operation string, err error) error {
	if err == nil {
		return nil
	}

	return fmt.Errorf("%s: %w", operation, err)
}

func (ss *SchemaService) applySchemaTransaction(
	c fs.Context,
	tx *schemaDirTransaction,
	changes *db.Changes,
) error {
	if err := tx.Activate(); err != nil {
		return err
	}

	if applyErr := ss.app.Reload(c, changes); applyErr != nil {
		rollbackErr := tx.Rollback()
		var reloadErr error
		if rollbackErr == nil {
			reloadErr = ss.app.Reload(c, reverseDBChanges(changes))
			if discardErr := tx.discard(); discardErr != nil {
				c.Logger().Warn("Could not remove schema transaction directory", discardErr)
			}
		}

		return errors.Join(
			fmt.Errorf("apply schema change: %w", applyErr),
			wrapSchemaTransactionError("roll back schema files", rollbackErr),
			wrapSchemaTransactionError("reload restored schemas", reloadErr),
		)
	}

	if err := tx.Commit(); err != nil {
		c.Logger().Warn("Could not remove committed schema transaction directory", err)
	}

	return nil
}

func reverseDBChanges(changes *db.Changes) *db.Changes {
	if changes == nil {
		return nil
	}

	tableRenames := make(map[string]string, len(changes.RenameTables))
	reversed := &db.Changes{
		RenameTables: make([]*db.RenameItem, 0, len(changes.RenameTables)),
		RenameFields: make([]*db.RenameItem, 0, len(changes.RenameFields)),
	}
	for _, item := range changes.RenameTables {
		if item == nil {
			continue
		}
		tableRenames[item.From] = item.To
		reversed.RenameTables = append(reversed.RenameTables, &db.RenameItem{
			Type:            item.Type,
			From:            item.To,
			To:              item.From,
			IsJunctionTable: item.IsJunctionTable,
			SchemaName:      item.SchemaName,
			SchemaNamespace: item.SchemaNamespace,
		})
	}

	for _, item := range changes.RenameFields {
		if item == nil {
			continue
		}
		schemaName := item.SchemaName
		if renamed, ok := tableRenames[schemaName]; ok {
			schemaName = renamed
		}
		schemaNamespace := item.SchemaNamespace
		if renamed, ok := tableRenames[schemaNamespace]; ok {
			schemaNamespace = renamed
		}
		reversed.RenameFields = append(reversed.RenameFields, &db.RenameItem{
			Type:            item.Type,
			From:            item.To,
			To:              item.From,
			IsJunctionTable: item.IsJunctionTable,
			SchemaName:      schemaName,
			SchemaNamespace: schemaNamespace,
		})
	}

	return reversed
}

// RecoverTransactions repairs an interrupted schema directory switch.
// A visible current directory means the staged version won the switch and
// startup can migrate it forward. If the current directory is missing, the
// last backup is restored before normal initialization continues.
func RecoverTransactions(currentDir string) error {
	currentDir = filepath.Clean(currentDir)
	matches, err := filepath.Glob(filepath.Join(filepath.Dir(currentDir), schemaTransactionPrefix+"*"))
	if err != nil {
		return err
	}

	for _, root := range matches {
		if _, statErr := os.Stat(currentDir); statErr != nil {
			if !os.IsNotExist(statErr) {
				return fmt.Errorf("inspect current schema directory: %w", statErr)
			}
			backupDir := filepath.Join(root, "backup")
			stagedDir := filepath.Join(root, "staged")
			sourceDir := backupDir
			if _, backupErr := os.Stat(backupDir); os.IsNotExist(backupErr) {
				sourceDir = stagedDir
			}

			if renameErr := os.Rename(sourceDir, currentDir); renameErr != nil {
				return fmt.Errorf("recover schema transaction %s: %w", root, renameErr)
			}
		}

		if removeErr := os.RemoveAll(root); removeErr != nil {
			return fmt.Errorf("remove recovered schema transaction %s: %w", root, removeErr)
		}
	}

	return nil
}
