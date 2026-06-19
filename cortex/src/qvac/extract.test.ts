import { extractEntities } from "./extract";
import { completion } from "@qvac/sdk";

function streamOf(json: string) {
  return {
    requestId: "r",
    tokenStream: (async function* () {
      // split mid-object to exercise incremental parsing
      yield json.slice(0, 30);
      yield json.slice(30);
    })(),
  };
}

test("streams nodes and edges, firing callbacks and returning both sets", async () => {
  const json =
    '[{"kind":"node","label":"QVAC","type":"tech"},{"kind":"node","label":"Privacy","type":"value"},{"kind":"edge","src":"QVAC","dst":"Privacy","relation":"enables"}]';
  (completion as jest.Mock).mockReturnValueOnce(streamOf(json));

  const nodes: any[] = [];
  const edges: any[] = [];
  const r = await extractEntities(
    "transcript",
    (n) => nodes.push(n),
    (e) => edges.push(e)
  );

  expect(r.nodes.map((n) => n.label)).toEqual(["QVAC", "Privacy"]);
  expect(r.edges[0]).toEqual({ src: "QVAC", dst: "Privacy", relation: "enables" });
  expect(nodes).toHaveLength(2);
  expect(edges).toHaveLength(1);
});
