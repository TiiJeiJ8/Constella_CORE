package http

import (
	"github.com/gin-gonic/gin"
	ginlib "github.com/gin-gonic/gin"
)

func registerRoutes(r *gin.Engine) {
	// attach health route and versioned API group
	r.GET("/health", func(c *ginlib.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	{
		users := api.Group("/users")
		{
			users.GET(":id", userHandlerGet)
		}
		rooms := api.Group("/rooms")
		{
			rooms.POST("", roomHandlerCreate)
		}
	}
}

// handler placeholders
func userHandlerGet(c *ginlib.Context)    {}
func roomHandlerCreate(c *ginlib.Context) {}
