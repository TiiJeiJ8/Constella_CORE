package main

import (
	"context"
	"log"
	"net/http"
	"time"
)

func main() {
	// minimal stdlib HTTP server to avoid external/internal package dependency
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	srv := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server run failed: %v", err)
		}
	}()

	// keep process alive (or use signal handling in future)
	time.Sleep(24 * time.Hour)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}
