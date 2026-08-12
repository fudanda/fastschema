package schemaservice

import (
	"os"
	"path/filepath"

	"github.com/fastschema/fastschema/db"
	"github.com/fastschema/fastschema/fs"
	"github.com/fastschema/fastschema/pkg/errors"
	"github.com/fastschema/fastschema/pkg/utils"
	"github.com/fastschema/fastschema/schema"
)

func (ss *SchemaService) Delete(c fs.Context, _ any) (fs.Map, error) {
	schemaName := c.Arg("name")
	currentSchema, err := ss.app.SchemaBuilder().Schema(schemaName)
	if err != nil {
		return nil, errors.NotFound(err.Error())
	}

	tx, err := newSchemaDirTransaction(ss.app.SchemaBuilder().Dir())
	if err != nil {
		return nil, errors.InternalServerError("could not create schema transaction: %s", err.Error())
	}
	defer func() {
		if discardErr := tx.discard(); discardErr != nil {
			c.Logger().Warn("Could not discard schema transaction", discardErr)
		}
	}()

	hasRelation := false
	// remove relation fields if the field type is relation
	updateFields := utils.Filter(currentSchema.Fields, func(field *schema.Field) bool {
		if field.Type.IsRelationType() && field.Relation.TargetSchemaName != schemaName {
			hasRelation = true
			return false
		}
		return true
	})

	// update the schema with the new fields without the relation fields
	if hasRelation {
		updateData := &SchemaUpdateData{
			Data: &schema.Schema{
				Name:           currentSchema.Name,
				Fields:         updateFields,
				Namespace:      currentSchema.Namespace,
				LabelFieldName: currentSchema.LabelFieldName,
			},
			RenameFields: []*db.RenameItem{},
			RenameTables: []*db.RenameItem{},
		}

		su := &SchemaUpdate{
			updateData:           updateData,
			currentSchemaBuilder: ss.app.SchemaBuilder(),
			newSchemaBuilderDir:  tx.stagedDir,
			updateSchemas:        map[string]*schema.Schema{},
			currentSchema:        currentSchema,
			systemSchemas:        ss.app.SystemSchemas(),
		}

		if err := su.update(); err != nil {
			return nil, errors.InternalServerError(err.Error())
		}
	}

	// delete the schema file
	schemaFile := filepath.Join(tx.stagedDir, schemaName+".json")
	if err := os.Remove(schemaFile); err != nil {
		return nil, errors.InternalServerError(err.Error())
	}

	if _, err := schema.NewBuilderFromDir(tx.stagedDir, ss.app.SystemSchemas()...); err != nil {
		return nil, errors.UnprocessableEntity("schema validation failed").WithData(err)
	}

	if err := ss.applySchemaTransaction(c, tx, nil); err != nil {
		return nil, errors.InternalServerError(err.Error())
	}

	return fs.Map{"message": "Schema deleted"}, nil
}
