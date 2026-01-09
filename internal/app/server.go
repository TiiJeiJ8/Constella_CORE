package app

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Constella_CORE/constella-server/internal/logging"
)

type Server struct {
	engine  *gin.Engine
	cleanup func()
}

func NewServer() *Server {
	// Use bootstrap to build engine with wired dependencies
	r, cleanup := SetupEngine()
	return &Server{engine: r, cleanup: cleanup}
}

// Run starts the HTTP server and handles graceful shutdown on SIGINT/SIGTERM.
func (s *Server) Run(addr string) error {
	srv := &http.Server{
		Addr:    addr,
		Handler: s.engine,
	}

	// start server
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logging.L().Fatalw("server run failed", "error", err)
		}
	}()

	// wait for interrupt
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logging.L().Infow("Shutting down server")

	// shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logging.L().Errorw("Server forced to shutdown", "error", err)
	}

	// run cleanup
	if s.cleanup != nil {
		s.cleanup()
	}

	logging.L().Infow("Server exiting")
	return nil
}
