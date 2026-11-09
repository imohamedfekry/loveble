export function TreeBranch({
  first,
  last,
}: {
  first?: boolean;
  last: boolean;
}) {
  return (
    <>
      {/* connecter from header to frist colomn (mt-0.5 + py-1 = 6px) */}
      {first && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-1.5 -left-[13px] h-1.5 w-px bg-line"
        />
      )}

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-0 -left-[13px] overflow-visible"
        width="13"
        height="28"
        viewBox="0 0 13 28"
        fill="none"
      >
        <path
          d={
            last
              ? "M0.5 0 V6 A8 8 0 0 0 8.5 14 H13"
              : "M0.5 0 V28 M0.5 6 A8 8 0 0 0 8.5 14 H13"
          }
          stroke="var(--line)"
          strokeWidth="1"
        />
      </svg>

      {/* باقي الخط العمودي: يبدأ بالظبط من نهاية الـ svg (28px) لآخر الـ wrapper */}
      {!last && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-7 bottom-0 -left-[13px] w-px bg-line"
        />
      )}
    </>
  );
}
