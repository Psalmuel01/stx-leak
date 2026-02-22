;; counter.clar
;; Permissionless counter. Backend bot can enforce wall-clock reset cadence off-chain.

(define-constant ERR_OVERFLOW (err u101))

;; max uint in Clarity (u128 max)
(define-constant MAX_COUNTER u340282366920938463463374607431768211455)

(define-data-var count uint u0)

(define-read-only (get-count)
  (ok (var-get count)))

(define-public (increment)
  (let ((current (var-get count)))
    (if (is-eq current MAX_COUNTER)
      ERR_OVERFLOW
      (begin
        (var-set count (+ current u1))
        (ok (var-get count))))))
        
(define-public (decrement)
  (let ((current (var-get count)))
    (if (is-eq current u0)
        (ok u0)
        (let ((new (- current u1)))
          (var-set count new)
          (ok new)
        )
    )
  )
)

(define-public (reset-counter)
  (begin
    (var-set count u0)
    (ok (var-get count))))
