package memory

import (
	"errors"
	"fmt"
	"sync"
	"time"

	domain "github.com/Constella_CORE/constella-server/internal/domain/user"
)

var (
	ErrUserExists = errors.New("user already exists")
)

type UserRepo struct {
	mu         sync.RWMutex
	byID       map[string]*domain.User
	byEmail    map[string]*domain.User
	byUsername map[string]*domain.User
}

func NewUserRepo() *UserRepo {
	return &UserRepo{
		byID:       make(map[string]*domain.User),
		byEmail:    make(map[string]*domain.User),
		byUsername: make(map[string]*domain.User),
	}
}

func (r *UserRepo) Create(u *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.byEmail[u.Email]; ok {
		return fmt.Errorf("%w: email", ErrUserExists)
	}
	if _, ok := r.byUsername[u.Username]; ok {
		return fmt.Errorf("%w: username", ErrUserExists)
	}

	if u.ID == "" {
		u.ID = fmt.Sprintf("u-%d", time.Now().UnixNano())
	}

	// store
	r.byID[u.ID] = u
	r.byEmail[u.Email] = u
	r.byUsername[u.Username] = u
	return nil
}

func (r *UserRepo) FindByEmail(email string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if u, ok := r.byEmail[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (r *UserRepo) FindByUsername(username string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if u, ok := r.byUsername[username]; ok {
		return u, nil
	}
	return nil, nil
}
