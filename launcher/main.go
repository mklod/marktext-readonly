package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const pipePath = `\\.\pipe\marktext-viewer`

func main() {
	start := time.Now()

	// Collect file args (skip flags)
	var files []string
	for _, arg := range os.Args[1:] {
		if !strings.HasPrefix(arg, "--") {
			files = append(files, arg)
		}
	}

	// Try connecting to the named pipe (running instance)
	// On Windows, named pipes are accessed via regular file I/O
	conn, err := net.Dial("unix", pipePath)
	if err != nil {
		// Fallback: try opening as a file (Windows named pipe)
		f, ferr := os.OpenFile(pipePath, os.O_WRONLY, 0)
		if ferr == nil {
			for _, file := range files {
				abs, _ := filepath.Abs(file)
				f.Write([]byte(abs + "\n"))
			}
			f.Close()
			fmt.Fprintf(os.Stderr, "[PERF] launcher-pipe-done: %dms\n", time.Since(start).Milliseconds())
			return
		}

		// No running instance — launch MarkText.exe
		exe, _ := os.Executable()
		dir := filepath.Dir(exe)
		marktext := filepath.Join(dir, "MarkText.exe")
		cmd := exec.Command(marktext, os.Args[1:]...)
		cmd.Dir = dir
		cmd.Start()
		fmt.Fprintf(os.Stderr, "[PERF] launcher-cold-start: %dms\n", time.Since(start).Milliseconds())
		return
	}

	// net.Dial worked
	for _, file := range files {
		abs, _ := filepath.Abs(file)
		conn.Write([]byte(abs + "\n"))
	}
	conn.Close()
	fmt.Fprintf(os.Stderr, "[PERF] launcher-pipe-done: %dms\n", time.Since(start).Milliseconds())
}
