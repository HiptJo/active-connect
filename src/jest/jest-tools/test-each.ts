/** This function can be used to run a jest test block for mutliple configurations
 * It can be used to run tests for different permissions if the same results are expected
 *
 * @param [T=string] - The object type of data
 *
 * @param {Array} data - The data array that should be used to generate the tests
 * @param {string} labels - Additional label information for each run
 * @param {cbk} testConfig - This method contains the test cases
 */
export function testEach<T = string>(
  data: T[],
  labels: string[],
  testConfig: (data: T, label?: string) => void
) {
  data.forEach((data: T, index: number) =>
    testConfig(data, labels && labels.length > index ? labels[index] : null)
  );
}
