import { testEach } from "../../../src/jest/";
it("should be possible to create a test-each wrapper", () => {
  testEach<string>(["data"], ["label"], (data: string, label: string) => {
    expect(data).toBe("data");
    expect(label).toBe("label");
  });

  var dataId = 1;
  testEach<string>(
    ["data1", "data2", "data3"],
    ["label1", "label2", "label3"],
    (data: string, label: string) => {
      expect(data).toBe("data" + dataId);
      expect(label).toBe("label" + dataId);
      dataId++;
    }
  );
  expect(dataId).toBe(4);
});

it("should be possible to leaf the labels empty", () => {
  testEach<string>(["data1", "data2"], [], (data: string, label: string) => {
    expect(data).toBeDefined();
    expect(label).toBe(null);
  });

  testEach<string>(
    ["data1", "data2"],
    ["label1"],
    (data: string, label: string) => {
      expect(data).toBeDefined();
      if (data == "data1") expect(label).toBe("label1");
      else expect(label).toBeNull();
    }
  );
});
