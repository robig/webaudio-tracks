function _(keyIn) {
	var userLang = navigator.language || navigator.userLanguage;
	userLang=userLang.substring(0,2);
	const data={
		"de": {
			'delete': 'Löschen',
			'Start': 'Bitte Session wählen.'
		},
		"en": {
			'delete': "Delete",
			'Start': 'Choose session and press Start to begin.'
		}
	}

	if(data[userLang] && data[userLang][keyIn]) return data[userLang][keyIn];

	return keyIn;
}

$('[textKey]').each(function() {
	//console.log(this);
	var key=$(this).attr('textKey');
	$(this).html(_(key));
});
