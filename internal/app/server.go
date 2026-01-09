package app

import (
	"github.com/gin-gonic/gin"
)

type Server struct {
	engine *gin.Engine
}

func NewServer() *Server {
	// Use bootstrap to build engine with wired dependencies
	r := SetupEngine()
	return &Server{engine: r}
}

func (s *Server) Run() error {
	// default listen address; can be loaded from config later
	return s.engine.Run(":3000")
}
