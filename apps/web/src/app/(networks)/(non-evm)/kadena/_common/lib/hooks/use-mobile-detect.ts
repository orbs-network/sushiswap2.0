export const useMobileDetect = () => {
  const userAgent =
    typeof navigator === 'undefined' ? 'SSR' : navigator?.userAgent

  const isAndroid = Boolean(userAgent?.match(/Android/i))
  const isIos = Boolean(userAgent?.match(/iPhone|iPad|iPod/i))
  const isOpera = Boolean(userAgent?.match(/Opera Mini/i))
  const isWindows = Boolean(userAgent?.match(/IEMobile/i))

  const isMobile = isAndroid || isIos || isOpera || isWindows

  return { isMobile }
}
