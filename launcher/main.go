package main

import (
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const pipeName = `\\.\pipe\marktext-viewer`

func main() {
	// Collect file args (skip flags)
	var files []string
	for _, arg := range os.Args[1:] {
		if !strings.HasPrefix(arg, "--") {
			files = append(files, arg)
		}
	}

	// Try connecting to the named pipe (running instance)
	conn, err := net.DialTimeout("pipe", pipeName, 200*time.Millisecond)
	if err == nil {
		// Send file paths, one per line
		for _, f := range files {
			abs, err := filepath.Abs(f)
			if err != nil {
				abs = f
			}
			conn.Write([]byte(abs + "\n"))
		}
		conn.Close()
		return
	}

	// No running instance — launch MarkText.exe from same directory
	exe, _ := os.Executable()
	dir := filepath.Dir(exe)
	marktext := filepath.Join(dir, "MarkText.exe")

	args := os.Args[1:]
	cmd := exec.Command(marktext, args...)
	cmd.Dir = dir
	cmd.Start()
}
