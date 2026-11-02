/**
 * A number WhatsApp will actually open.
 *
 * `wa.me` takes an international number with no plus, no spaces and no leading
 * zero. A Nigerian brand types its number the way it says it out loud —
 * "0809 777 7952" — and the obvious implementation (strip everything that is
 * not a digit) turns that into `wa.me/08097777952`, which resolves to nothing.
 * The button looks right, the link is dead, and the one thing on the page that
 * was meant to start a sale does not.
 *
 * Lives in builder-core because two very different callers need the same
 * answer: the `whatsapp-button` module, which renders inside a tenant Worker
 * with no database, and the tenant's own fact-gathering, which fills the
 * `contact.whatsappLink` slot. One of them being right and the other wrong is
 * worse than both being wrong, because only one of them gets reported.
 */

/** Nigeria. The default because that is who this is for; pass another for anyone else. */
export const DEFAULT_DIAL_CODE = "234"

/**
 * `null` when there is nothing dialable here — which the caller must render as
 * NO button rather than a dead one.
 */
export function whatsappNumber(
  raw: unknown,
  dialCode: string = DEFAULT_DIAL_CODE
): string | null {
  if (typeof raw !== "string") return null
  const digits = raw.replace(/[^0-9]/g, "")
  if (!digits) return null

  // Already international, including the common "00" prefix for it.
  const withoutIdd = digits.startsWith("00") ? digits.slice(2) : digits
  if (withoutIdd.startsWith(dialCode)) return sane(withoutIdd)

  // A leading zero is the unambiguous local form, in every country that uses
  // one: drop it and dial the country.
  if (withoutIdd.startsWith("0")) return sane(dialCode + withoutIdd.slice(1))

  /**
   * Nigeria only, and deliberately narrow: a bare ten-digit number beginning
   * 7, 8 or 9 is a Nigerian mobile with the trunk zero left off, which is how
   * half of them are written on a poster. Everywhere else a bare number is
   * ambiguous — a ten-digit US number is complete as it stands — so it is left
   * exactly as typed rather than guessed at.
   */
  if (
    dialCode === DEFAULT_DIAL_CODE &&
    withoutIdd.length === 10 &&
    /^[789]/.test(withoutIdd)
  ) {
    return sane(dialCode + withoutIdd)
  }

  return sane(withoutIdd)
}

/** Too short to be a phone number, or too long to be one. */
function sane(digits: string): string | null {
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

/** The address itself, with an optional prefilled message. */
export function whatsappHref(
  raw: unknown,
  opts: { message?: string; dialCode?: string } = {}
): string | null {
  const number = whatsappNumber(raw, opts.dialCode ?? DEFAULT_DIAL_CODE)
  if (!number) return null
  const text = (opts.message ?? "").trim()
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
