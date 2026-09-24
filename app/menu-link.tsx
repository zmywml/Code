'use client';
import {SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';
export default function MenuLink({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){const {setOpenMobile}=useSidebar();return <SidebarMenuButton isActive={active} onClick={()=>{onClick();setOpenMobile(false);}}>{children}</SidebarMenuButton>}
