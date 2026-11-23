const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
export const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const formatDate = (date) => dateFormatter.format(new Date(date));
export const formatTime = (date) => timeFormatter.format(new Date(date));

export async function api(url, options = {}) {
  const response = await fetch(url, options);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Check that the API is running.",
    );
  }
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Check the required fields and try again.",
    );
  return data;
}
