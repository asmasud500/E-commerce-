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
const upazilasByDistrict:Record<string,string[]> = {
  "Barguna": [
    "Amtali",
    "Bamna",
    "Barguna Sadar",
    "Betagi",
    "Patharghata",
    "Taltali"
  ],
  "Barishal": [
    "Muladi",
    "Babuganj",
    "Agailjhara",
    "Barisal Sadar",
    "Bakerganj",
    "Banaripara",
    "Gaurnadi",
    "Hizla",
    "Mehendiganj",
    "Wazirpur"
  ],
  "Bhola": [
    "Bhola Sadar",
    "Burhanuddin",
    "Char Fasson",
    "Daulatkhan",
    "Lalmohan",
    "Manpura",
    "Tazumuddin"
  ],
  "Jhalokati": [
    "Jhalokati Sadar",
    "Kathalia",
    "Nalchity",
    "Rajapur"
  ],
  "Patuakhali": [
    "Bauphal",
    "Dashmina",
    "Galachipa",
    "Kalapara",
    "Mirzaganj",
    "Patuakhali Sadar",
    "Dumki",
    "Rangabali"
  ],
  "Pirojpur": [
    "Bhandaria",
    "Kaukhali",
    "Mathbaria",
    "Nazirpur",
    "Nesarabad",
    "Pirojpur Sadar",
    "Zianagar"
  ],
  "Bandarban": [
    "Bandarban Sadar",
    "Thanchi",
    "Lama",
    "Naikhongchhari",
    "Ali kadam",
    "Rowangchhari",
    "Ruma"
  ],
  "Brahmanbaria": [
    "Brahmanbaria Sadar",
    "Ashuganj",
    "Nasirnagar",
    "Nabinagar",
    "Sarail",
    "Shahbazpur Town",
    "Kasba",
    "Akhaura",
    "Bancharampur",
    "Bijoynagar"
  ],
  "Chandpur": [
    "Chandpur Sadar",
    "Faridganj",
    "Haimchar",
    "Haziganj",
    "Kachua",
    "Matlab Uttar",
    "Matlab Dakkhin",
    "Shahrasti"
  ],
  "Chattogram": [
    "Anwara",
    "Banshkhali",
    "Boalkhali",
    "Chandanaish",
    "Fatikchhari",
    "Hathazari",
    "Lohagara",
    "Mirsharai",
    "Patiya",
    "Rangunia",
    "Raozan",
    "Sandwip",
    "Satkania",
    "Sitakunda"
  ],
  "Cumilla": [
    "Barura",
    "Brahmanpara",
    "Burichong",
    "Chandina",
    "Chauddagram",
    "Daudkandi",
    "Debidwar",
    "Homna",
    "Comilla Sadar",
    "Laksam",
    "Monohorgonj",
    "Meghna",
    "Muradnagar",
    "Nangalkot",
    "Comilla Sadar South",
    "Titas"
  ],
  "Cox's Bazar": [
    "Chakaria",
    "Cox's Bazar Sadar",
    "Kutubdia",
    "Maheshkhali",
    "Ramu",
    "Teknaf",
    "Ukhia",
    "Pekua",
    "Eidgaon"
  ],
  "Feni": [
    "Feni Sadar",
    "Chagalnaiya",
    "Daganbhyan",
    "Parshuram",
    "Fhulgazi",
    "Sonagazi"
  ],
  "Khagrachhari": [
    "Dighinala",
    "Khagrachhari",
    "Lakshmichhari",
    "Mahalchhari",
    "Manikchhari",
    "Matiranga",
    "Panchhari",
    "Ramgarh"
  ],
  "Lakshmipur": [
    "Lakshmipur Sadar",
    "Raipur",
    "Ramganj",
    "Ramgati",
    "Komol Nagar"
  ],
  "Noakhali": [
    "Noakhali Sadar",
    "Begumganj",
    "Chatkhil",
    "Companyganj",
    "Shenbag",
    "Hatia",
    "Kobirhat",
    "Sonaimuri",
    "Suborno Char"
  ],
  "Rangamati": [
    "Rangamati Sadar",
    "Belaichhari",
    "Bagaichhari",
    "Barkal",
    "Juraichhari",
    "Rajasthali",
    "Kaptai",
    "Langadu",
    "Nannerchar",
    "Kaukhali"
  ],
  "Dhaka": [
    "Dhamrai",
    "Dohar",
    "Keraniganj",
    "Nawabganj",
    "Savar"
  ],
  "Faridpur": [
    "Faridpur Sadar",
    "Boalmari",
    "Alfadanga",
    "Madhukhali",
    "Bhanga",
    "Nagarkanda",
    "Charbhadrasan",
    "Sadarpur",
    "Shaltha"
  ],
  "Gazipur": [
    "Gazipur Sadar",
    "Kaliakior",
    "Kapasia",
    "Sripur",
    "Kaliganj",
    "Tongi"
  ],
  "Gopalganj": [
    "Gopalganj Sadar",
    "Kashiani",
    "Kotalipara",
    "Muksudpur",
    "Tungipara"
  ],
  "Jamalpur": [
    "Dewanganj",
    "Baksiganj",
    "Islampur",
    "Jamalpur Sadar",
    "Madarganj",
    "Melandaha",
    "Sarishabari",
    "Narundi Police I.C"
  ],
  "Kishoreganj": [
    "Astagram",
    "Bajitpur",
    "Bhairab",
    "Hossainpur",
    "Itna",
    "Karimganj",
    "Katiadi",
    "Kishoreganj Sadar",
    "Kuliarchar",
    "Mithamain",
    "Nikli",
    "Pakundia",
    "Tarail"
  ],
  "Madaripur": [
    "Madaripur Sadar",
    "Kalkini",
    "Rajoir",
    "Shibchar",
    "Dasar"
  ],
  "Manikganj": [
    "Manikganj Sadar",
    "Singair",
    "Shibalaya",
    "Saturia",
    "Harirampur",
    "Ghior",
    "Daulatpur"
  ],
  "Munshiganj": [
    "Lohajang",
    "Sreenagar",
    "Munshiganj Sadar",
    "Sirajdikhan",
    "Tongibari",
    "Gazaria"
  ],
  "Mymensingh": [
    "Bhaluka",
    "Trishal",
    "Haluaghat",
    "Muktagachha",
    "Dhobaura",
    "Fulbaria",
    "Gaffargaon",
    "Gauripur",
    "Ishwarganj",
    "Mymensingh Sadar",
    "Nandail",
    "Phulpur"
  ],
  "Narayanganj": [
    "Araihazar",
    "Sonargaon",
    "Bandar",
    "Narayanganj Sadar",
    "Rupganj",
    "Siddhirganj"
  ],
  "Narsingdi": [
    "Belabo",
    "Monohardi",
    "Narsingdi Sadar",
    "Palash",
    "Raipura, Narsingdi",
    "Shibpur"
  ],
  "Netrokona": [
    "Kendua",
    "Atpara",
    "Barhatta",
    "Durgapur",
    "Kalmakanda",
    "Madan",
    "Mohanganj",
    "Netrokona Sadar",
    "Purbadhala",
    "Khaliajuri"
  ],
  "Rajbari": [
    "Baliakandi",
    "Goalandaghat",
    "Pangsha",
    "Kalukhali",
    "Rajbari Sadar"
  ],
  "Shariatpur": [
    "Shariatpur Sadar",
    "Damudya",
    "Naria",
    "Jajira",
    "Bhedarganj",
    "Gosairhat"
  ],
  "Sherpur": [
    "Jhenaigati",
    "Nakla",
    "Nalitabari",
    "Sherpur Sadar",
    "Sreebardi"
  ],
  "Tangail": [
    "Tangail Sadar",
    "Sakhipur",
    "Basail",
    "Madhupur",
    "Ghatail",
    "Kalihati",
    "Nagarpur",
    "Mirzapur",
    "Gopalpur",
    "Delduar",
    "Bhuapur",
    "Dhanbari"
  ],
  "Bagerhat": [
    "Bagerhat Sadar",
    "Chitalmari",
    "Fakirhat",
    "Kachua",
    "Mollahat",
    "Mongla",
    "Morrelganj",
    "Rampal",
    "Sarankhola"
  ],
  "Chuadanga": [
    "Damurhuda",
    "Chuadanga Sadar",
    "Jibannagar",
    "Alamdanga"
  ],
  "Jashore": [
    "Abhaynagar",
    "Keshabpur",
    "Bagherpara",
    "Jessore Sadar",
    "Chaugachha",
    "Manirampur",
    "Jhikargachha",
    "Sharsha"
  ],
  "Jhenaidah": [
    "Jhenaidah Sadar",
    "Maheshpur",
    "Kaliganj",
    "Kotchandpur",
    "Shailkupa",
    "Harinakunda"
  ],
  "Khulna": [
    "Terokhada",
    "Batiaghata",
    "Dacope",
    "Dumuria",
    "Dighalia",
    "Koyra",
    "Paikgachha",
    "Phultala",
    "Rupsa"
  ],
  "Kushtia": [
    "Kushtia Sadar",
    "Kumarkhali",
    "Daulatpur",
    "Mirpur",
    "Bheramara",
    "Khoksa"
  ],
  "Magura": [
    "Magura Sadar",
    "Mohammadpur",
    "Shalikha",
    "Sreepur"
  ],
  "Meherpur": [
    "Gangni",
    "Mujib Nagar",
    "Meherpur Sadar"
  ],
  "Narail": [
    "Narail Sadar",
    "Lohagara",
    "Kalia"
  ],
  "Satkhira": [
    "Satkhira Sadar",
    "Assasuni",
    "Debhata",
    "Tala",
    "Kalaroa",
    "Kaliganj",
    "Shyamnagar"
  ],
  "Bogura": [
    "Adamdighi",
    "Bogra Sadar",
    "Sherpur",
    "Dhunat",
    "Dhupchanchia",
    "Gabtali",
    "Kahaloo",
    "Nandigram",
    "Sahajanpur",
    "Sariakandi",
    "Shibganj",
    "Sonatala"
  ],
  "Joypurhat": [
    "Joypurhat Sadar",
    "Akkelpur",
    "Kalai",
    "Khetlal",
    "Panchbibi"
  ],
  "Naogaon": [
    "Naogaon Sadar",
    "Mohadevpur",
    "Manda",
    "Niamatpur",
    "Atrai",
    "Raninagar",
    "Patnitala",
    "Dhamoirhat",
    "Sapahar",
    "Porsha",
    "Badalgachhi"
  ],
  "Natore": [
    "Natore Sadar",
    "Baraigram",
    "Bagatipara",
    "Lalpur",
    "Natore Sadar",
    "Baraigram"
  ],
  "Chapainawabganj": [
    "Bholahat",
    "Gomastapur",
    "Nachole",
    "Nawabganj Sadar",
    "Shibganj"
  ],
  "Pabna": [
    "Atgharia",
    "Bera",
    "Bhangura",
    "Chatmohar",
    "Faridpur",
    "Ishwardi",
    "Pabna Sadar",
    "Santhia",
    "Sujanagar"
  ],
  "Rajshahi": [
    "Bagha",
    "Bagmara",
    "Charghat",
    "Durgapur",
    "Godagari",
    "Mohanpur",
    "Paba",
    "Puthia",
    "Tanore"
  ],
  "Sirajganj": [
    "Sirajganj Sadar",
    "Belkuchi",
    "Chauhali",
    "Kamarkhanda",
    "Kazipur",
    "Raiganj",
    "Shahjadpur",
    "Tarash",
    "Ullahpara"
  ],
  "Dinajpur": [
    "Birampur",
    "Birganj",
    "Biral",
    "Bochaganj",
    "Chirirbandar",
    "Phulbari",
    "Ghoraghat",
    "Hakimpur",
    "Kaharole",
    "Khansama",
    "Dinajpur Sadar",
    "Nawabganj",
    "Parbatipur"
  ],
  "Gaibandha": [
    "Fulchhari",
    "Gaibandha Sadar",
    "Gobindaganj",
    "Palashbari",
    "Sadullapur",
    "Saghata",
    "Sundarganj"
  ],
  "Kurigram": [
    "Kurigram Sadar",
    "Nageshwari",
    "Bhurungamari",
    "Phulbari",
    "Rajarhat",
    "Ulipur",
    "Chilmari",
    "Rowmari",
    "Char Rajibpur"
  ],
  "Lalmonirhat": [
    "Lalmanirhat Sadar",
    "Aditmari",
    "Kaliganj",
    "Hatibandha",
    "Patgram"
  ],
  "Nilphamari": [
    "Nilphamari Sadar",
    "Saidpur",
    "Jaldhaka",
    "Kishoreganj",
    "Domar",
    "Dimla"
  ],
  "Panchagarh": [
    "Panchagarh Sadar",
    "Debiganj",
    "Boda",
    "Atwari",
    "Tetulia"
  ],
  "Rangpur": [
    "Badarganj",
    "Mithapukur",
    "Gangachara",
    "Kaunia",
    "Rangpur Sadar",
    "Pirgachha",
    "Pirganj",
    "Taraganj"
  ],
  "Thakurgaon": [
    "Thakurgaon Sadar",
    "Pirganj",
    "Baliadangi",
    "Haripur",
    "Ranisankail"
  ],
  "Habiganj": [
    "Ajmiriganj",
    "Baniachang",
    "Bahubal",
    "Chunarughat",
    "Habiganj Sadar",
    "Lakhai",
    "Madhabpur",
    "Nabiganj",
    "Shayestaganj"
  ],
  "Moulvibazar": [
    "Moulvibazar Sadar",
    "Barlekha",
    "Juri",
    "Kamalganj",
    "Kulaura",
    "Rajnagar",
    "Sreemangal"
  ],
  "Sunamganj": [
    "Bishwamvarpur",
    "Chhatak",
    "Derai",
    "Dharampasha",
    "Dowarabazar",
    "Jagannathpur",
    "Jamalganj",
    "Sulla",
    "Sunamganj Sadar",
    "Shanthiganj",
    "Tahirpur",
    "Madhyanagar"
  ],
  "Sylhet": [
    "Sylhet Sadar",
    "Beanibazar",
    "Bishwanath",
    "Dakshin Surma",
    "Balaganj",
    "Companiganj",
    "Fenchuganj",
    "Golapganj",
    "Gowainghat",
    "Jointapur",
    "Kanaighat",
    "Zakiganj",
    "Nobigonj"
  ]
};
export const BANGLADESH_LOCATIONS:DivisionLocation[]=Object.entries(districtNames).map(([name,districts])=>({name,districts:districts.map(d=>({name:d,upazilas:upazilasByDistrict[d]||[]}))}));
export function findDivision(name:string){return BANGLADESH_LOCATIONS.find(x=>x.name===name);}
export function findDistrict(division:string,district:string){return findDivision(division)?.districts.find(x=>x.name===district);}
