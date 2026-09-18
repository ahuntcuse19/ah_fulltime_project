import { redirect } from "next/navigation";

// Section 11: no home page beyond the nav. The root goes straight to the week grid.
export default function Home() {
  redirect("/week");
}
