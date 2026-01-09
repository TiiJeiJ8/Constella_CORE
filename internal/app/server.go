package app

import (
    "github.com/gin-gonic/gin"
)

type Server struct {
    engine *gin.Engine
}

func NewServer() *Server {
    r := gin.Default()
    // register routes
    registerRoutes(r)
    return &Server{engine: r}
}

// registerRoutes sets up the HTTP routes for the server.
func registerRoutes(r *gin.Engine) {
    // basic health check route; add your application routes here
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })
}

func (s *Server) Run() error {
    // default listen address; can be loaded from config later
    return s.engine.Run(":3000")
}
