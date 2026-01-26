import { KanbanBoard } from '../components/kanban/KanbanBoard';

function Dashboard() {
    return (
        <div className="flex flex-col gap-0 sm:gap-3 md:gap-4 h-full">

            {/* Kanban Board */}
            <div className="bg-panel border-0 sm:border border-blue/12 sm:shadow-lg overflow-hidden w-full h-full flex flex-col">
                <div className="p-0 sm:p-2 md:p-4 h-full flex flex-col">
                    <KanbanBoard />
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
