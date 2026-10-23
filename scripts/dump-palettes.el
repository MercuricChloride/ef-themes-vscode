;;; dump-palettes.el --- Write the resolved Ef palettes as JSON -*- lexical-binding: t -*-

;; Each Ef theme only defines part of its palette; `modus-themes'
;; generates the rest.  This loads the real packages and records every
;; palette entry with mappings resolved to a hex value (or
;; "unspecified"), so the VS Code themes use exactly what Emacs shows.
;;
;; Run it through scripts/update-palettes.sh.

(require 'json)
(require 'ef-themes)

(defun ef-vscode--resolve (palette)
  "Return PALETTE as an alist of (NAME . HEX), first entry winning."
  (let (seen out)
    (dolist (entry palette)
      (let ((name (car entry)))
        (unless (memq name seen)
          (push name seen)
          (let ((value (modus-themes-retrieve-palette-value name palette)))
            (push (cons name (if (stringp value) (downcase value) "unspecified"))
                  out)))))
    (nreverse out)))

(defun ef-vscode-dump (file ef-rev modus-rev)
  "Write all Ef palettes to FILE, noting EF-REV and MODUS-REV."
  (let (themes)
    (dolist (theme ef-themes-items)
      (load (format "%s-theme" theme) nil t)
      (let ((props (assq theme ef-themes-with-properties)))
        (push (cons theme
                    `((description . ,(nth 2 props))
                      (kind . ,(symbol-name (nth 3 props)))
                      (palette . ,(ef-vscode--resolve
                                   (symbol-value (intern (format "%s-palette" theme)))))))
              themes)))
    (with-temp-file file
      (let ((json-encoding-pretty-print t))
        (insert (json-encode
                 `((source . ((ef-themes . ,ef-rev)
                              (modus-themes . ,modus-rev)))
                   (themes . ,(nreverse themes)))))
        (insert "\n")))))

;;; dump-palettes.el ends here
