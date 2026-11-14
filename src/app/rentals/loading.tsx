import SkateLoading from "@/components/SkateLoading";

export default function RentalsLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
      <SkateLoading size="lg" text="Loading active skaters..." />
    </div>
  );
}

