package app

import (
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	udomain "github.com/Constella_CORE/constella-server/internal/domain/user"
	mem "github.com/Constella_CORE/constella-server/internal/infrastructure/persistence/memory"
	pg "github.com/Constella_CORE/constella-server/internal/infrastructure/persistence/postgres"
	httpHandler "github.com/Constella_CORE/constella-server/internal/interface/http/handler"
	httpMiddleware "github.com/Constella_CORE/constella-server/internal/interface/http/middleware"

	// Use pgx stdlib adapter as the preferred Postgres driver.
	// Ensure you run: `go get github.com/jackc/pgx/v5/stdlib` and `go mod tidy` locally.
	_ "github.com/jackc/pgx/v5/stdlib"
)

// SetupEngine wires minimal in-memory repositories and HTTP handlers.
// It returns a configured *gin.Engine ready to Run().
func SetupEngine() *gin.Engine {
	r := gin.Default()

	// health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	// choose datastore by env
	datastore := os.Getenv("DATASTORE") // "memory" (default) or "postgres"

	// auth handlers with secret from environment (fallback to dev secret)
	jwtSecret := os.Getenv("CONSTELLA_JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-change-me"
		log.Println("WARNING: using dev jwt secret; set CONSTELLA_JWT_SECRET in production")
	}

	var userRepo udomain.Repository

	if datastore == "postgres" {
		dbURL := os.Getenv("DATABASE_URL")
		if dbURL == "" {
			log.Println("DATASTORE=postgres set but DATABASE_URL is empty; falling back to memory repo")
			userRepo = mem.NewUserRepo()
		} else {
			db, err := sql.Open("postgres", dbURL)
			if err != nil {
				log.Printf("failed to open postgres: %v; falling back to memory repo", err)
				userRepo = mem.NewUserRepo()
			} else {
				if err := db.Ping(); err != nil {
					log.Printf("failed to ping postgres: %v; falling back to memory repo", err)
					userRepo = mem.NewUserRepo()
				} else {
					log.Println("Using Postgres datastore")
					userRepo = pg.NewUserRepo(db)
				}
			}
		}
	} else {
		userRepo = mem.NewUserRepo()
	}

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
