import { getPrismaClient } from "database";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const userId = "someUserId";

export async function POST(req: NextRequest) {
  const { title } = await req.json();
  // TODO: get userId from middleware

  const client = getPrismaClient(userId);

  const conversation = await client.conversation.create({
    data: {
      title: title || "New conversation",
      userId: userId,
    },
  });

  revalidateTag("conversations");

  return NextResponse.json({
    data: conversation.id,
  });
}

export async function GET() {
  const client = getPrismaClient(userId);

  const conversations = await client.conversation.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    data: conversations,
  });
}
