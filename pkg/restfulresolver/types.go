package restfulresolver

import "github.com/fastschema/fastschema/fs"

type Handler func(c *Context) error

type Cookie = fs.Cookie
