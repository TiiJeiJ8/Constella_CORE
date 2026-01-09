package postgres

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	domain "github.com/Constella_CORE/constella-server/internal/domain/user"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(u *domain.User) error {
	if u.ID == "" {
		u.ID = fmt.Sprintf("u-%d", time.Now().UnixNano())
	}
	query := `INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(query, u.ID, u.Username, u.Email, u.PasswordHash)
	if err != nil {
		return err
	}
	return nil
}

func (r *UserRepo) FindByEmail(email string) (*domain.User, error) {
	row := r.db.QueryRow(`SELECT id, username, email, password_hash FROM users WHERE email = $1`, email)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) FindByUsername(username string) (*domain.User, error) {
	row := r.db.QueryRow(`SELECT id, username, email, password_hash FROM users WHERE username = $1`, username)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}
