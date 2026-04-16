// Last modified: 2026-04-02--2300
// marktext-open: Fast launcher for MarkText Viewer.
// Sends file path via named pipe to running instance, or cold-starts MarkText.exe.
package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const pipeName = `\\.\pipe\marktext-viewer`

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: marktext-open <file.md>")
		os.Exit(1)
	}

	filePath, err := filepath.Abs(os.Args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Bad path: %v\n", err)
		os.Exit(1)
	}

	start := time.Now()

	// Try sending via named pipe (fast path)
	conn, err := net.DialTimeout("unix", pipeName, 500*time.Millisecond)
	if err == nil {
		defer conn.Close()
		conn.Write([]byte(filePath + "\n"))
		fmt.Printf("[PERF] Pipe send: %v\n", time.Since(start))
		return
	}

	// No running instance — cold start MarkText.exe
	fmt.Printf("[PERF] No pipe, cold starting... (%v)\n", time.Since(start))
	exeDir, _ := os.Executable()
	marktext := filepath.Join(filepath.Dir(exeDir), "MarkText.exe")

	cmd := exec.Command(marktext, filePath)
	cmd.Start()
	fmt.Printf("[PERF] Launched MarkText.exe: %v\n", time.Since(start))
}
