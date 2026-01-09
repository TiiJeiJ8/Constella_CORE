package logging

import (
    "os"

    "go.uber.org/zap"
)

var sug *zap.SugaredLogger

// InitLogger initializes a sugared zap logger. If DEBUG env var is set, use development config.
func InitLogger() error {
    var l *zap.Logger
    var err error
    if os.Getenv("DEBUG") != "" {
        l, err = zap.NewDevelopment()
    } else {
        l, err = zap.NewProduction()
    }
    if err != nil {
        return err
    }
    sug = l.Sugar()
    return nil
}

// L returns the global sugared logger. Call InitLogger first.
func L() *zap.SugaredLogger {
    return sug
}

// Sync flushes any buffered log entries.
func Sync() {
    if sug != nil {
        _ = sug.Sync()
    }
}
