const cme = chrome.management;
const getI18N = chrome.i18n.getMessage;

// Generate page
const $searchField = $(`<input placeholder="${ getI18N('searchTxt') }">`);
const eul = $('<ul id="extList">');
const $options = $('<div class="options">');
const $disableAllButton = $(`<button>${ getI18N('disAll') }</button>`);
const $extensionPageButton = $(`<button>${ getI18N('extensionPage') }</button>`);

$options
	.append($disableAllButton)
	.append($extensionPageButton);

$('body')
	.append($searchField)
	.append($options)
	.append(eul);

$searchField.focus();
window.scrollTo(0, 0); // fix overscroll caused by autofocus

// Generate extension list
cme.getAll(ets => {
	const listHTML = ets
	.filter(extension => extension.id !== 'pbgjpgbpljobkekbhnnmlikbbfhbhmem')
	.sort((a, b) => {
		if (a.enabled === b.enabled) {
			return a.name.localeCompare(b.name); // sort by name
		}
		return a.enabled < b.enabled ? 1 : -1; // sort by state
	})
	.map(createList);
	$(listHTML.join('')).appendTo(eul);
});

$('body').on('click', '.extName', function () {
	const extSel = $(this);
	const eid = extSel.attr('data-id');
	cme.get(eid, e => {
		extSel.parent().remove();
		if (!e.enabled) {
			cme.setEnabled(eid, true, () => {
				eul.prepend(createList(e));
			});
		} else {
			cme.setEnabled(eid, false, () => {
				eul.append(createList(e));
			});
		}
	});
}).on('mouseup', '.extName', e => {
	if (e.which == 3) {
		cme.uninstall(e.target.dataset.id);
	}
});

cme.onUninstalled.addListener(id => {
	$(`#${id}`).remove();
});

$searchField.on('keyup', function () {
	const keywords = this.value.split(' ').filter(s => s.length);
	const extensions = $('#extList li');
	const hiddenExtensions = extensions.not((i, el) => {
		return keywords.every(word => el.dataset.name.includes(word));
	});
	hiddenExtensions.hide();
	extensions.not(hiddenExtensions).show();
});

function getIcon(icons, size = 16) {
	// Set fallback icon
	let selectedIcon = chrome.extension.getURL('icon-puzzle.svg');

	// Get retina size if necessary
	size *= window.devicePixelRatio;

	if (icons && icons.length) {
		// Get a large icon closest to the desired size
		icons.reverse().some(icon => {
			if (icon.size < size) {
				return false;
			}
			selectedIcon = icon.url;
		});
	}
	return selectedIcon;
}

// disable the default context menu
eul.on('contextmenu', () => false);

$disableAllButton.click(() => {
	if (confirm(getI18N('disableAll'))) {
		disableAll();
	}
});

$extensionPageButton.click(() => {
	chrome.tabs.create({url: 'chrome://extensions'});
});

function createList(e) {
	return `
		<li class='ext ${e.enabled ? '' : 'disabled'}' id='${e.id}' data-name="${e.name.toLowerCase()}">
			<span class='extName' data-id='${e.id}' title='${getI18N('toggleEnable')}'>
				<img class='extIcon' src='${getIcon(e.icons, 16)}'>
				${e.name}
			</span>
			${
				e.optionsUrl ? `
					<a class='extOptions' href='${e.optionsUrl}' title='${getI18N('openOpt')}' target='_blank'>
						<img src="${chrome.extension.getURL('icon-options.svg')}">
					</a>
				` : ``
			}
		</li>
	`;
}

function disableAll() {
	cme.getAll(ets => {
		const myid = getI18N('@@extension_id');
		for (let i = 0; i < ets.length; i++) {
			if (ets[i].id !== myid) {
				cme.setEnabled(ets[i].id, false);
			}
		}
		$('.ext').addClass('disabled');
	});
}
