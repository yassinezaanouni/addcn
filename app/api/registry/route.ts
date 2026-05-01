import { NextResponse } from "next/server";
import type { SavedSnippet } from "@/types/snippet";
import {
  saveServerSnippet,
  getServerSnippets,
  getServerSnippetByName,
  deleteServerSnippet,
} from "@/lib/server-storage";

export async function POST(request: Request) {
  try {
    const snippet = (await request.json()) as SavedSnippet;

    if (!snippet.id || !snippet.name) {
      return NextResponse.json(
        { error: "Snippet must have id and name" },
        { status: 400 },
      );
    }

    // Check for duplicate name (different snippet with same name)
    const existing = await getServerSnippetByName(snippet.name);
    if (existing && existing.id !== snippet.id) {
      return NextResponse.json(
        { error: `A snippet named "${snippet.name}" already exists` },
        { status: 409 },
      );
    }

    await saveServerSnippet(snippet);

    return NextResponse.json({ success: true, id: snippet.id });
  } catch (error) {
    console.error("Registry sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync snippet" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const snippets = await getServerSnippets();
    return NextResponse.json(snippets);
  } catch (error) {
    console.error("Failed to get snippets:", error);
    return NextResponse.json(
      { error: "Failed to get snippets" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteServerSnippet(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete snippet:", error);
    return NextResponse.json(
      { error: "Failed to delete snippet" },
      { status: 500 },
    );
  }
}
