export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number,
): T {
  let isThrottled = false;

  return function (this: any, ...args: Parameters<T>) {
    if (isThrottled) return;

    func.apply(this, args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
    }, limit);
  } as T;
}
