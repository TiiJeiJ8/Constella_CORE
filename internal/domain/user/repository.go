package user

type Repository interface {
	Create(u *User) error
	FindByEmail(email string) (*User, error)
	FindByUsername(username string) (*User, error)
}
