import { Outlet } from "react-router-dom";

export default function MainLayout() {
    return (
         <main className="flex-1 overflow-auto p-4">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
    )
}