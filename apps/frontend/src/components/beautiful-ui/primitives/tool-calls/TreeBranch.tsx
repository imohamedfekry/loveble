/**
 * فرع الشجرة. كل الرسم في نظام إحداثيات واحد (بكسلات ثابتة، من غير scaling):
 *  - الـ svg (ارتفاعه 28px = ارتفاع الصف) فيه path واحد: الخط العمودي + المنحنى،
 *    فمفيش overlap ولا اختلاف سُمك/شفافية بين الخط والفرع.
 *  - باقي الخط لتحت (من 28px لآخر الـ wrapper) span بعرض 1px على نفس المحور (x=0.5).
 *  - آخر صف: الخط بينزل لحد بداية المنحنى بس.
 * لازم الـ wrapper يكون `relative` وارتفاع الصف 28px (min-h-7).
 */
export function TreeBranch({
  first,
  last,
}: {
  first?: boolean;
  last: boolean;
}) {
  return (
    <>
      {/* وصلة من الهيدر لأول صف (mt-0.5 + py-1 = 6px) */}
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
