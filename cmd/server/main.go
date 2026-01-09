package main

import (
	"log"

	"github.com/Constella_CORE/constella-server/internal/app"
	"github.com/Constella_CORE/constella-server/internal/config"
)

func main() {
	cfg := config.Load()
	log.Printf("Starting Constella server (datastore=%s) on %s", cfg.DataStore, cfg.Port)

	// run server and listen on configured port
	s := app.NewServer()
	if err := s.Run(cfg.Port); err != nil {
		log.Fatalf("server run failed: %v", err)
	}
}
