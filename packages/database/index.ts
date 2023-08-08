import { getModShard } from "./sharding/sharding";
import { PrismaClient } from "@prisma/client";

const NUM_SHARDS = parseInt(process.env.NUM_SHARDS || "1");

/*
 * Get the proper Prisma client for the userId passed in and the number of nodes in the cluster.
 */
const getShardedPrismaClient = (userId: string, numNodes: number) => {
  const shard = getModShard(userId, numNodes);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env[`DATABASE_URL_${shard}`],
      },
    },
  });
  return prisma;
};

export const getPrismaClient = (userId: string) => {
  return getShardedPrismaClient(userId, NUM_SHARDS);
};
