;; counter.clar
;; Public counter with interval-based reset.

(define-constant ERR_UNDERFLOW (err u100))
(define-constant ERR_TOO_EARLY (err u101))
(define-constant RESET_INTERVAL_BLOCKS u100) ;; ~16.5 hours on 10 min block target

(define-data-var count int 0)
(define-data-var last-reset-height uint u0)

(define-read-only (get-count)
  (ok (var-get count)))

(define-read-only (get-next-reset-height)
  (ok (+ (var-get last-reset-height) RESET_INTERVAL_BLOCKS)))

(define-public (increment)
  (begin
    (var-set count (+ (var-get count) 1))
    (ok (var-get count))))

(define-public (decrement)
  (let ((current (var-get count)))
    (if (<= current 0)
      ERR_UNDERFLOW
      (begin
        (var-set count (- current 1))
        (ok (var-get count))))))

(define-public (reset-counter)
  (let (
    (current-height block-height)
    (last-height (var-get last-reset-height))
  )
    (if (< current-height (+ last-height RESET_INTERVAL_BLOCKS))
      ERR_TOO_EARLY
      (begin
        (var-set count 0)
        (var-set last-reset-height current-height)
        (ok (var-get count))))))
