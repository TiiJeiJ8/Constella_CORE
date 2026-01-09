package main

import (
	"log"

	"github.com/Constella_CORE/constella-server/internal/app"
)

func main() {
	log.Println("Starting Constella server (in-memory repos)")
	s := app.NewServer()
	if err := s.Run(); err != nil {
		log.Fatalf("server run failed: %v", err)
	}
}
