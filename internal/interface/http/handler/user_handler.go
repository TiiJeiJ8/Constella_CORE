package handler

import "github.com/gin-gonic/gin"

func GetUser(c *gin.Context) {
	// TODO: implement
	c.JSON(200, gin.H{"message": "user handler placeholder"})
}
