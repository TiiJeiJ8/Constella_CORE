package app

import (
	"database/sql"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	config "github.com/Constella_CORE/constella-server/internal/config"
	"github.com/Constella_CORE/constella-server/internal/logging"

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
// It returns a configured *gin.Engine ready to Run() and a cleanup func to close resources.
func SetupEngine() (*gin.Engine, func()) {
	r := gin.Default()

	// health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	// load configuration
	cfg := config.Load()

	// choose datastore by config
	datastore := cfg.DataStore // "memory" (default) or "postgres"
	jwtSecret := cfg.JWTSecret
	if jwtSecret == "dev-secret-change-me" {
		logging.L().Warnw("using dev jwt secret; set CONSTELLA_JWT_SECRET in production")
	}

	var userRepo udomain.Repository
	var dbConn *sql.DB
	cleanup := func() {}

	if datastore == "postgres" {
		dbURL := os.Getenv("DATABASE_URL")
		if dbURL == "" {
			logging.L().Warn("DATASTORE=postgres set but DATABASE_URL is empty; falling back to memory repo")
			userRepo = mem.NewUserRepo()
		} else {
			db, err := sql.Open("postgres", dbURL)
			if err != nil {
				logging.L().Errorw("failed to open postgres; falling back to memory repo", "error", err)
				userRepo = mem.NewUserRepo()
			} else {
				if err := db.Ping(); err != nil {
					logging.L().Errorw("failed to ping postgres; falling back to memory repo", "error", err)
					userRepo = mem.NewUserRepo()
				} else {
					logging.L().Infow("Using Postgres datastore")
					userRepo = pg.NewUserRepo(db)
					dbConn = db
					cleanup = func() {
						_ = dbConn.Close()
					}
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

	// return engine and cleanup func
	return r, cleanup
}
