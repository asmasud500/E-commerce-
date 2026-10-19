export type DistrictLocation={name:string;upazilas:string[]};
export type DivisionLocation={name:string;districts:DistrictLocation[]};
const districtNames:Record<string,string[]> = {
"Barishal":["Barguna","Barishal","Bhola","Jhalokati","Patuakhali","Pirojpur"],
"Chattogram":["Bandarban","Brahmanbaria","Chandpur","Chattogram","Cumilla","Cox's Bazar","Feni","Khagrachhari","Lakshmipur","Noakhali","Rangamati"],
"Dhaka":["Dhaka","Faridpur","Gazipur","Gopalganj","Kishoreganj","Madaripur","Manikganj","Munshiganj","Narayanganj","Narsingdi","Rajbari","Shariatpur","Tangail"],
"Khulna":["Bagerhat","Chuadanga","Jashore","Jhenaidah","Khulna","Kushtia","Magura","Meherpur","Narail","Satkhira"],
"Mymensingh":["Jamalpur","Mymensingh","Netrokona","Sherpur"],
"Rajshahi":["Bogura","Joypurhat","Naogaon","Natore","Chapainawabganj","Pabna","Rajshahi","Sirajganj"],
"Rangpur":["Dinajpur","Gaibandha","Kurigram","Lalmonirhat","Nilphamari","Panchagarh","Rangpur","Thakurgaon"],
"Sylhet":["Habiganj","Moulvibazar","Sunamganj","Sylhet"]
};
const rangpurUpazilas:Record<string,string[]> = {
"Dinajpur":["Birampur","Birganj","Biral","Bochaganj","Chirirbandar","Phulbari","Ghoraghat","Hakimpur","Kaharole","Khansama","Dinajpur Sadar","Nawabganj","Parbatipur"],
"Gaibandha":["Fulchhari","Gaibandha Sadar","Gobindaganj","Palashbari","Sadullapur","Saghata","Sundarganj"],
"Kurigram":["Bhurungamari","Char Rajibpur","Chilmari","Phulbari","Kurigram Sadar","Nageshwari","Rajarhat","Raomari","Ulipur"],
"Lalmonirhat":["Aditmari","Hatibandha","Kaliganj","Lalmonirhat Sadar","Patgram"],
"Nilphamari":["Dimla","Domar","Jaldhaka","Kishoreganj","Nilphamari Sadar","Saidpur"],
"Panchagarh":["Atwari","Boda","Debiganj","Panchagarh Sadar","Tetulia"],
"Rangpur":["Badarganj","Gangachara","Kaunia","Rangpur Sadar","Mithapukur","Pirgachha","Pirganj","Taraganj"],
"Thakurgaon":["Baliadangi","Haripur","Pirganj","Ranisankail","Thakurgaon Sadar"]
};
export const BANGLADESH_LOCATIONS:DivisionLocation[]=Object.entries(districtNames).map(([name,districts])=>({name,districts:districts.map(d=>({name:d,upazilas:name==="Rangpur"?(rangpurUpazilas[d]||[]):[]}))}));
export function findDivision(name:string){return BANGLADESH_LOCATIONS.find(x=>x.name===name);}
export function findDistrict(division:string,district:string){return findDivision(division)?.districts.find(x=>x.name===district);}
