import { Search, SlidersHorizontal, X } from "lucide-react";

type Option={value:string;label:string};

export default function CourseCatalogFilter({
  action,
  query,
  subject,
  subjects,
  filterName,
  filterLabel,
  filterValue,
  filterOptions,
}:{
  action:string;
  query:string;
  subject:string;
  subjects:string[];
  filterName:string;
  filterLabel:string;
  filterValue:string;
  filterOptions:Option[];
}){
  const active=Boolean(query||subject||filterValue);
  return <form className="course-catalog-filter" action={action} method="get" role="search">
    <label className="course-filter-field"><span>Find a course</span><div className="course-filter-input"><Search size={16}/><input name="q" type="search" defaultValue={query} placeholder="Search by course, subject or level"/></div></label>
    <label className="course-filter-field"><span><SlidersHorizontal size={13}/> Subject</span><select name="subject" defaultValue={subject}><option value="">All subjects</option>{subjects.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
    <label className="course-filter-field"><span>{filterLabel}</span><select name={filterName} defaultValue={filterValue}><option value="">All</option>{filterOptions.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
    <button type="submit"><Search size={15}/> Search</button>
    {active?<a className="course-filter-clear" href={action}><X size={14}/> Clear</a>:<span/>}
  </form>;
}

