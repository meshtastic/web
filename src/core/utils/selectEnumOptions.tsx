export const renderOptions = (enumValue: {
  [s: string]: string | number;
}): JSX.Element[] => {
  const optionsEnumValues = enumValue
    ? Object.entries(enumValue).filter((value) => typeof value[1] === "number")
    : [];

  return optionsEnumValues.map(([name, value], index) => (
    <option key={index} value={value}>
      {name}
    </option>
  ));
};
