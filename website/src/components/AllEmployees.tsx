import RightArrow from "../assets/right-arrow.svg"
import { Link } from "react-router-dom"


export type Employee = {
  id: string;
  fullname: string;
  pic?: string;
};

export function EmployeeCard({ employeeData }: { employeeData: Employee }) {
    return (
        <Link to={`/employees/employee/${employeeData.id}`} className="rounded-2xl p-6 bg-white/90 border border-blue-100 shadow-xl flex items-center gap-4 cursor-pointer transition-all duration-300 ease-linear hover:scale-105 hover:shadow-2xl">
            <img src={`${import.meta.env.VITE_API_URL}/${employeeData.pic}`} className="w-14 aspect-square rounded-full border-2 border-blue-200 bg-blue-100" />
            <h2 className="font-bold text-xl text-blue-900">{employeeData.fullname}</h2>
            <img src={RightArrow} className="ml-auto" />
        </Link>
    )
}

