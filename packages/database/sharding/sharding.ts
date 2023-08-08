import * as crypto from "crypto";

/*
 * Get the shard for the userId passed in and the number of nodes in the cluster.
 */
export const getModShard = (userId: string, numNodes: number): number => {
  const hash = crypto.createHash("sha256");
  hash.update(userId);
  const hashHex = hash.digest("hex");
  const hashInt = parseInt(hashHex, 16);
  return hashInt % numNodes;
};
