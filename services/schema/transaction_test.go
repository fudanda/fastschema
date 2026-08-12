package schemaservice

import (
	"testing"

	"github.com/fastschema/fastschema/db"
	"github.com/stretchr/testify/assert"
)

func TestReverseDBChanges(t *testing.T) {
	changes := &db.Changes{
		RenameTables: []*db.RenameItem{{
			Type:            "table",
			From:            "posts_tags",
			To:              "articles_tags",
			IsJunctionTable: true,
		}},
		RenameFields: []*db.RenameItem{{
			Type:            "column",
			From:            "posts",
			To:              "articles",
			SchemaName:      "posts_tags",
			SchemaNamespace: "posts_tags",
		}},
	}

	reversed := reverseDBChanges(changes)
	assert.Equal(t, "articles_tags", reversed.RenameTables[0].From)
	assert.Equal(t, "posts_tags", reversed.RenameTables[0].To)
	assert.True(t, reversed.RenameTables[0].IsJunctionTable)
	assert.Equal(t, "articles", reversed.RenameFields[0].From)
	assert.Equal(t, "posts", reversed.RenameFields[0].To)
	assert.Equal(t, "articles_tags", reversed.RenameFields[0].SchemaName)
	assert.Equal(t, "articles_tags", reversed.RenameFields[0].SchemaNamespace)
}

func TestReverseDBChangesNil(t *testing.T) {
	assert.Nil(t, reverseDBChanges(nil))
}
