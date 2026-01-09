package main

import (
	"log"

	"github.com/Constella_CORE/constella-server/internal/app"
	"github.com/Constella_CORE/constella-server/internal/config"
	"github.com/Constella_CORE/constella-server/internal/logging"
)

func main() {
	cfg := config.Load()
	// initialize structured logger
	if err := logging.InitLogger(); err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}
	defer logging.Sync()

	logging.L().Infow("Starting Constella server", "datastore", cfg.DataStore, "port", cfg.Port)

	// run server and listen on configured port
	s := app.NewServer()
	if err := s.Run(cfg.Port); err != nil {
		logging.L().Fatalw("server run failed", "error", err)
	}
}
