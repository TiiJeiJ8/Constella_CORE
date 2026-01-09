<#
Simple PowerShell wrapper for golang-migrate CLI
Usage: .\scripts\migrate.ps1 -cmd up -db "postgres://user:pass@host:5432/db?sslmode=disable"
#>

param(
    [Parameter(Mandatory=$true)] [string] $cmd,
    [Parameter(Mandatory=$true)] [string] $db,
    [int] $version
)

switch ($cmd) {
    'up' {
        migrate -path ./migrations -database $db up
    }
    'down' {
        migrate -path ./migrations -database $db down
    }
    'force' {
        if (-not $version) { Write-Error "force requires -version"; exit 2 }
        migrate -path ./migrations -database $db force $version
    }
    default {
        Write-Error "unknown cmd: $cmd"
        exit 2
    }
}
