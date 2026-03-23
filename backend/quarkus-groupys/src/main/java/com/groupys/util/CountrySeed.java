package com.groupys.util;

import com.groupys.model.Country;
import com.groupys.repository.CountryRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class CountrySeed {

    @Inject
    CountryRepository countryRepository;

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        if (countryRepository.count() > 0) return;

        List<String[]> countries = List.of(
            new String[]{"AF","Afghanistan"}, new String[]{"AL","Albania"},
            new String[]{"DZ","Algeria"}, new String[]{"AD","Andorra"},
            new String[]{"AO","Angola"}, new String[]{"AG","Antigua and Barbuda"},
            new String[]{"AR","Argentina"}, new String[]{"AM","Armenia"},
            new String[]{"AU","Australia"}, new String[]{"AT","Austria"},
            new String[]{"AZ","Azerbaijan"}, new String[]{"BS","Bahamas"},
            new String[]{"BH","Bahrain"}, new String[]{"BD","Bangladesh"},
            new String[]{"BB","Barbados"}, new String[]{"BY","Belarus"},
            new String[]{"BE","Belgium"}, new String[]{"BZ","Belize"},
            new String[]{"BJ","Benin"}, new String[]{"BT","Bhutan"},
            new String[]{"BO","Bolivia"}, new String[]{"BA","Bosnia and Herzegovina"},
            new String[]{"BW","Botswana"}, new String[]{"BR","Brazil"},
            new String[]{"BN","Brunei"}, new String[]{"BG","Bulgaria"},
            new String[]{"BF","Burkina Faso"}, new String[]{"BI","Burundi"},
            new String[]{"CV","Cabo Verde"}, new String[]{"KH","Cambodia"},
            new String[]{"CM","Cameroon"}, new String[]{"CA","Canada"},
            new String[]{"CF","Central African Republic"}, new String[]{"TD","Chad"},
            new String[]{"CL","Chile"}, new String[]{"CN","China"},
            new String[]{"CO","Colombia"}, new String[]{"KM","Comoros"},
            new String[]{"CG","Congo"}, new String[]{"CD","Congo (DRC)"},
            new String[]{"CR","Costa Rica"}, new String[]{"HR","Croatia"},
            new String[]{"CU","Cuba"}, new String[]{"CY","Cyprus"},
            new String[]{"CZ","Czech Republic"}, new String[]{"DK","Denmark"},
            new String[]{"DJ","Djibouti"}, new String[]{"DM","Dominica"},
            new String[]{"DO","Dominican Republic"}, new String[]{"EC","Ecuador"},
            new String[]{"EG","Egypt"}, new String[]{"SV","El Salvador"},
            new String[]{"GQ","Equatorial Guinea"}, new String[]{"ER","Eritrea"},
            new String[]{"EE","Estonia"}, new String[]{"SZ","Eswatini"},
            new String[]{"ET","Ethiopia"}, new String[]{"FJ","Fiji"},
            new String[]{"FI","Finland"}, new String[]{"FR","France"},
            new String[]{"GA","Gabon"}, new String[]{"GM","Gambia"},
            new String[]{"GE","Georgia"}, new String[]{"DE","Germany"},
            new String[]{"GH","Ghana"}, new String[]{"GR","Greece"},
            new String[]{"GD","Grenada"}, new String[]{"GT","Guatemala"},
            new String[]{"GN","Guinea"}, new String[]{"GW","Guinea-Bissau"},
            new String[]{"GY","Guyana"}, new String[]{"HT","Haiti"},
            new String[]{"HN","Honduras"}, new String[]{"HU","Hungary"},
            new String[]{"IS","Iceland"}, new String[]{"IN","India"},
            new String[]{"ID","Indonesia"}, new String[]{"IR","Iran"},
            new String[]{"IQ","Iraq"}, new String[]{"IE","Ireland"},
            new String[]{"IL","Israel"}, new String[]{"IT","Italy"},
            new String[]{"JM","Jamaica"}, new String[]{"JP","Japan"},
            new String[]{"JO","Jordan"}, new String[]{"KZ","Kazakhstan"},
            new String[]{"KE","Kenya"}, new String[]{"KI","Kiribati"},
            new String[]{"KW","Kuwait"}, new String[]{"KG","Kyrgyzstan"},
            new String[]{"LA","Laos"}, new String[]{"LV","Latvia"},
            new String[]{"LB","Lebanon"}, new String[]{"LS","Lesotho"},
            new String[]{"LR","Liberia"}, new String[]{"LY","Libya"},
            new String[]{"LI","Liechtenstein"}, new String[]{"LT","Lithuania"},
            new String[]{"LU","Luxembourg"}, new String[]{"MG","Madagascar"},
            new String[]{"MW","Malawi"}, new String[]{"MY","Malaysia"},
            new String[]{"MV","Maldives"}, new String[]{"ML","Mali"},
            new String[]{"MT","Malta"}, new String[]{"MH","Marshall Islands"},
            new String[]{"MR","Mauritania"}, new String[]{"MU","Mauritius"},
            new String[]{"MX","Mexico"}, new String[]{"FM","Micronesia"},
            new String[]{"MD","Moldova"}, new String[]{"MC","Monaco"},
            new String[]{"MN","Mongolia"}, new String[]{"ME","Montenegro"},
            new String[]{"MA","Morocco"}, new String[]{"MZ","Mozambique"},
            new String[]{"MM","Myanmar"}, new String[]{"NA","Namibia"},
            new String[]{"NR","Nauru"}, new String[]{"NP","Nepal"},
            new String[]{"NL","Netherlands"}, new String[]{"NZ","New Zealand"},
            new String[]{"NI","Nicaragua"}, new String[]{"NE","Niger"},
            new String[]{"NG","Nigeria"}, new String[]{"KP","North Korea"},
            new String[]{"MK","North Macedonia"}, new String[]{"NO","Norway"},
            new String[]{"OM","Oman"}, new String[]{"PK","Pakistan"},
            new String[]{"PW","Palau"}, new String[]{"PA","Panama"},
            new String[]{"PG","Papua New Guinea"}, new String[]{"PY","Paraguay"},
            new String[]{"PE","Peru"}, new String[]{"PH","Philippines"},
            new String[]{"PL","Poland"}, new String[]{"PT","Portugal"},
            new String[]{"QA","Qatar"}, new String[]{"RO","Romania"},
            new String[]{"RU","Russia"}, new String[]{"RW","Rwanda"},
            new String[]{"KN","Saint Kitts and Nevis"}, new String[]{"LC","Saint Lucia"},
            new String[]{"VC","Saint Vincent and the Grenadines"}, new String[]{"WS","Samoa"},
            new String[]{"SM","San Marino"}, new String[]{"ST","Sao Tome and Principe"},
            new String[]{"SA","Saudi Arabia"}, new String[]{"SN","Senegal"},
            new String[]{"RS","Serbia"}, new String[]{"SC","Seychelles"},
            new String[]{"SL","Sierra Leone"}, new String[]{"SG","Singapore"},
            new String[]{"SK","Slovakia"}, new String[]{"SI","Slovenia"},
            new String[]{"SB","Solomon Islands"}, new String[]{"SO","Somalia"},
            new String[]{"ZA","South Africa"}, new String[]{"KR","South Korea"},
            new String[]{"SS","South Sudan"}, new String[]{"ES","Spain"},
            new String[]{"LK","Sri Lanka"}, new String[]{"SD","Sudan"},
            new String[]{"SR","Suriname"}, new String[]{"SE","Sweden"},
            new String[]{"CH","Switzerland"}, new String[]{"SY","Syria"},
            new String[]{"TW","Taiwan"}, new String[]{"TJ","Tajikistan"},
            new String[]{"TZ","Tanzania"}, new String[]{"TH","Thailand"},
            new String[]{"TL","Timor-Leste"}, new String[]{"TG","Togo"},
            new String[]{"TO","Tonga"}, new String[]{"TT","Trinidad and Tobago"},
            new String[]{"TN","Tunisia"}, new String[]{"TR","Turkey"},
            new String[]{"TM","Turkmenistan"}, new String[]{"TV","Tuvalu"},
            new String[]{"UG","Uganda"}, new String[]{"UA","Ukraine"},
            new String[]{"AE","United Arab Emirates"}, new String[]{"GB","United Kingdom"},
            new String[]{"US","United States"}, new String[]{"UY","Uruguay"},
            new String[]{"UZ","Uzbekistan"}, new String[]{"VU","Vanuatu"},
            new String[]{"VE","Venezuela"}, new String[]{"VN","Vietnam"},
            new String[]{"YE","Yemen"}, new String[]{"ZM","Zambia"},
            new String[]{"ZW","Zimbabwe"}
        );

        for (String[] entry : countries) {
            Country c = new Country();
            c.code = entry[0];
            c.name = entry[1];
            countryRepository.persist(c);
        }
    }
}
