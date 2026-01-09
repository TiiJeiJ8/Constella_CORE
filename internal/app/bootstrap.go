package app

import (
	"time"

	"github.com/gin-gonic/gin"

	mem "github.com/Constella_CORE/constella-server/internal/infrastructure/persistence/memory"
	httpHandler "github.com/Constella_CORE/constella-server/internal/interface/http/handler"
	httpMiddleware "github.com/Constella_CORE/constella-server/internal/interface/http/middleware"
)

// SetupEngine wires minimal in-memory repositories and HTTP handlers.
// It returns a configured *gin.Engine ready to Run().
func SetupEngine() *gin.Engine {
	r := gin.Default()

	// health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	// create in-memory user repo
	userRepo := mem.NewUserRepo()

	// auth handlers with a simple secret (for local testing)
	// In real deployments, load secret from config/env
	jwtSecret := "dev-secret-change-me"
	authH := httpHandler.NewAuthHandler(userRepo, jwtSecret)

	api := r.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authH.Register)
			auth.POST("/login", authH.Login)
		}

		// protected example route: GET /api/v1/me
		// uses middleware to validate JWT and inject userID into context
		mw := httpMiddleware.AuthMiddleware(jwtSecret)
		api.GET("/me", mw, func(c *gin.Context) {
			if uid, ok := c.Get("userID"); ok {
				c.JSON(200, gin.H{"userID": uid})
				return
			}
			c.JSON(401, gin.H{"error": "unauthorized"})
		})
	}

	return r
}
