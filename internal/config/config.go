package config

import (
	"fmt"
	"os"
)

// Config holds runtime configuration read from environment variables.
type Config struct {
	Port        string // e.g. ":3000" or "3000"
	DataStore   string // "memory" or "postgres"
	DatabaseURL string
	JWTSecret   string
}

// Load loads configuration from environment variables with sensible defaults.
func Load() *Config {
	cfg := &Config{}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	// accept either ":3000" or "3000"; normalize to ":port"
	if port[0] != ':' {
		port = fmt.Sprintf(":%s", port)
	}
	cfg.Port = port

	ds := os.Getenv("DATASTORE")
	if ds == "" {
		ds = "memory"
	}
	cfg.DataStore = ds

	cfg.DatabaseURL = os.Getenv("DATABASE_URL")

	jwt := os.Getenv("CONSTELLA_JWT_SECRET")
	if jwt == "" {
		jwt = "dev-secret-change-me"
	}
	cfg.JWTSecret = jwt

	return cfg
}
