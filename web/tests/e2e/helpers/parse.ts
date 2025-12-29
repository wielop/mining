export const parseFirstNumber = (value: string) => {
  const cleaned = value.replace(/,/g, "");
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
};

export const fromHundredths = (value: bigint) => Number(value) / 100;
